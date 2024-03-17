import { Component, OnInit } from '@angular/core';
import { DiscordApiService } from 'src/app/services/discord-api.service';
import { Profile } from 'src/app/models/discord-profile.model';
import { LanyardService } from 'src/app/services/lanyard.service';
import { Lanyard, Activity } from 'src/app/models/lanyard-profile.model';
import { environment } from 'src/environments/environment';

declare global {
  interface Window {
    loadAtropos(): void;
  }
}

@Component({
  selector: 'app-card-profile',
  templateUrl: './card-profile.component.html',
  styleUrls: ['./card-profile.component.scss']
})
export class CardProfileComponent implements OnInit {

  userId = environment.discordId;
  userDataStatus = false;
  userData?: Profile;
  userBioFormatted?: string;
  themesColor: string[] = [];

  message = '';
  lanyardData!: Lanyard | null;
  lanyardActivities: Activity[] = [];

  constructor(private discordApiService: DiscordApiService, private lanyardService: LanyardService) { }

  ngOnInit(): void {
    this.getDiscordUserData();

    this.getLanyardData();
  }

  public getDiscordUserData(): void {
    this.discordApiService.getDiscordUser(this.userId).subscribe({
      next: (data: Profile) => {
        this.userDataStatus = true;
        this.userData = data;

        // Change all the /n to <br>
        this.userBioFormatted = this.userData.user_profile?.bio?.replace(/\n/g, '<br>');

        const themeColors = this.userData.user_profile?.theme_colors || [];
        if (themeColors.length === 0) {
          this.themesColor = ['#5C5C5C', '#5C5C5C'];
        } else {
          // Convert the decimal color to hex
          this.themesColor = themeColors.map((color) => {
            return '#' + color.toString(16).padStart(6, '0').toUpperCase();
          });
        }
      },
      error: (error) => {
        this.userDataStatus = false;
        console.log(error);
      }
    }).add(() => {
      window.loadAtropos();
    });
  }

  public getLanyardData(): void {
    this.lanyardService.setupWebSocket();

    this.lanyardService.getLanyardData().subscribe({
      next: (data) => {
        this.lanyardData = data;
        console.log(this.lanyardData);

        this.lanyardActivities = this.lanyardData.d?.activities || [];

        // Format the timestamps of the activities
        this.lanyardActivities.forEach((activity) => {
          if (activity.timestamps) {
            if(!activity.timestamps.start) {
              activity.timestamps.start = '';
              return;
            };
            const startTime = new Date(activity.timestamps.start || 0);
            const currentTime = new Date();
            const timeDifference = currentTime.getTime() - startTime.getTime();

            const hours = Math.floor(timeDifference / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

            let timeAgoMessage = '';
            if (hours > 0) {
              timeAgoMessage += `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
            }

            if (minutes > 0) {
              if (timeAgoMessage !== '') {
                timeAgoMessage += ` and ${minutes} ${minutes === 1 ? 'minute elapsed' : 'minutes elapsed'}`;
              } else {
                timeAgoMessage += `${minutes} ${minutes === 1 ? 'minute elapsed' : 'minutes elapsed'}`;
              }
            }

            activity.timestamps.start = timeAgoMessage || '';
          }
        });
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  getActivityImageUrl(activity: Activity, asset?: string): string {
    if(activity.id === 'custom') {
      if(activity.emoji?.id) {
        return `https://cdn.discordapp.com/emojis/${activity.emoji.id}.${activity.emoji.animated ? 'gif' : 'png'}`;
      } else return `https://nyxcodeapi.onrender.com/discord/camilo404/avatar/${this.userId}`;
    } else if (asset && asset.startsWith('spotify:')) {
      const parts = asset.split(':');
      return `https://i.scdn.co/image/${parts[1]}`;
    } else if(asset && asset.search('https/') !== -1){
      const parts = asset.split('https/');
      return `https://${parts[1]}`;
    } else {
      return `https://dcdn.dstn.to/app-icons/${activity.application_id}.png`
    }
  }

  public sendMessage(): void {
    window.open(`https://discord.com/users/${this.userId}`, '_blank');

    this.message = '';
  }

  handleImageError(event: any) {
    event.target.src = '../../../assets/images/no-image-found.jpg';
  }
}
